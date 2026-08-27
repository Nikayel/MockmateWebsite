import type { DbClient } from "../client"
import type { ClaimDocument, CreateDocumentInput } from "../../domain/document"
import { generateId } from "../../util/ids"
import { GET_DOCUMENTS_FOR_CLAIM, INSERT_DOCUMENT } from "../queries"

interface DocumentRow {
  id: string
  claim_id: string
  file_name: string
  content_type: string
  legacy_path: string
  created_at: string
}

function toDocument(row: DocumentRow): ClaimDocument {
  return {
    id: row.id,
    claimId: row.claim_id,
    fileName: row.file_name,
    contentType: row.content_type,
    legacyPath: row.legacy_path,
    createdAt: row.created_at,
  }
}

export async function insertDocument(
  db: DbClient,
  input: CreateDocumentInput
): Promise<ClaimDocument> {
  const id = generateId("doc")
  const createdAt = new Date().toISOString()
  const { rows } = await db.query<DocumentRow>(INSERT_DOCUMENT, [
    id,
    input.claimId,
    input.fileName,
    input.contentType,
    input.legacyPath,
    createdAt,
  ])
  return toDocument(rows[0])
}

/** Documents have no tenant column of their own. */
export async function getDocumentsForClaim(
  db: DbClient,
  claimId: string
): Promise<ClaimDocument[]> {
  const { rows } = await db.query<DocumentRow>(GET_DOCUMENTS_FOR_CLAIM, [claimId])
  return rows.map(toDocument)
}

/** One query per claim, reusing `getDocumentsForClaim`. */
export async function getDocumentsForClaims(
  db: DbClient,
  claimIds: string[]
): Promise<Record<string, ClaimDocument[]>> {
  const result: Record<string, ClaimDocument[]> = {}
  for (const claimId of claimIds) {
    result[claimId] = await getDocumentsForClaim(db, claimId)
  }
  return result
}
