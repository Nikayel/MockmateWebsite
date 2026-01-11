/**
 * Announcement Types
 *
 * Shared type definitions for the announcement system.
 * Used across API routes, components, and admin panel.
 */

/**
 * Announcement priority levels
 */
export type AnnouncementPriority = "info" | "warning" | "critical" | "success"

/**
 * Announcement display types
 */
export type AnnouncementType = "banner" | "modal" | "toast" | "page"

/**
 * Target audience for announcements
 */
export type AnnouncementAudience = "all" | "free" | "pro" | "enterprise" | "specific"

/**
 * Call-to-action configuration
 */
export interface AnnouncementCTA {
  text: string
  url: string
}

/**
 * Base announcement interface for client-side usage
 * Contains only the fields needed for display
 */
export interface Announcement {
  id: string
  title: string
  message: string
  type: AnnouncementType
  priority: AnnouncementPriority
  dismissible: boolean
  cta?: AnnouncementCTA
}

/**
 * Full announcement interface with all admin fields
 * Used for CRUD operations in admin panel
 */
export interface FullAnnouncement extends Announcement {
  targetAudience: AnnouncementAudience
  targetUserIds?: string[]
  startDate: string
  endDate?: string
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  views: number
  dismissals: number
}

/**
 * Input for creating a new announcement
 */
export interface CreateAnnouncementInput {
  title: string
  message: string
  type: AnnouncementType
  priority: AnnouncementPriority
  targetAudience: AnnouncementAudience
  targetUserIds?: string[]
  startDate: string
  endDate?: string
  dismissible: boolean
  active: boolean
  cta?: AnnouncementCTA
}

/**
 * Input for updating an announcement
 */
export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
  id: string
}
