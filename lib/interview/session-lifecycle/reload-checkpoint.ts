export interface ReloadCheckpoint {
  localSaved: boolean
  cloudSaved: Promise<boolean>
}

type CheckpointProvider = () => ReloadCheckpoint
let checkpointProvider: CheckpointProvider | undefined
let retainedUntil: number | undefined

/** Browser-only registration owned by the mounted attempt, never shared through a cookie. */
export function registerReloadCheckpoint(
  provider: CheckpointProvider
): (final?: ReloadCheckpoint) => void {
  checkpointProvider = provider
  retainedUntil = undefined
  return (final) => {
    if (checkpointProvider !== provider) return
    // Error boundaries render after the editor unmounts. Retain its final save
    // briefly so a failed device write cannot bypass the reload guard.
    checkpointProvider = final ? () => final : undefined
    retainedUntil = final ? Date.now() + 10000 : undefined
  }
}

/** Local writes happen synchronously before any wait. Cloud backup gets a bounded chance. */
export function reloadAfterCheckpoint(reload: () => void, onBlocked: () => void): void {
  if (retainedUntil !== undefined && Date.now() >= retainedUntil) checkpointProvider = undefined
  if (!checkpointProvider) {
    reload()
    return
  }
  const provider = checkpointProvider
  let checkpoint: ReloadCheckpoint
  try {
    checkpoint = provider()
  } catch {
    onBlocked()
    return
  }
  let timer: ReturnType<typeof setTimeout>
  const deadline = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), 1500)
  })
  void Promise.race([checkpoint.cloudSaved.catch(() => false), deadline]).then((cloudSaved) => {
    clearTimeout(timer)
    if (checkpointProvider !== provider) return
    if (checkpoint.localSaved || cloudSaved) reload()
    else onBlocked()
  })
}
