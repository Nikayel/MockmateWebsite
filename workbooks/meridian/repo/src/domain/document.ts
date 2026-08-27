export interface ClaimDocument {
  id: string
  claimId: string
  fileName: string
  contentType: string
  /** Where this file actually lives today - see the migration that eventually drops it. */
  legacyPath: string
  createdAt: string
}

export interface CreateDocumentInput {
  claimId: string
  fileName: string
  contentType: string
  legacyPath: string
}
