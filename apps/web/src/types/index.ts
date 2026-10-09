// Shared TypeScript types for the Workshop Registration Service

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF'
export type WorkshopStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'
export type RegistrationStatus = 'ACTIVE' | 'CANCELLED' | 'WAITLISTED'
export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'WORKSHOP_CREATED'
  | 'WORKSHOP_UPDATED'
  | 'WORKSHOP_CANCELLED'
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_CANCELLED'
  | 'WAITLIST_PROMOTED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: string
  name: string
  address: string
  active: boolean
}

export interface Workshop {
  id: string
  code: string
  title: string
  description?: string
  instructor: string
  locationId: string
  location: Location
  startsAt: string
  endsAt: string
  capacity: number
  reservedSeats: number
  availableSeats: number
  status: WorkshopStatus
  cancelReason?: string
  createdAt: string
  updatedAt: string
  activeRegistrations?: number
  registrations?: Registration[]
}

export interface Registration {
  id: string
  workshopId: string
  workshop?: Pick<Workshop, 'id' | 'code' | 'title' | 'startsAt'>
  attendeeName: string
  attendeeEmail: string
  status: RegistrationStatus
  registeredById: string
  registeredBy?: Pick<User, 'id' | 'name' | 'email'>
  registeredAt: string
  cancelledById?: string
  cancelledBy?: Pick<User, 'id' | 'name' | 'email'>
  cancelledAt?: string
}

export interface AuditLog {
  id: string
  actorId: string
  actor: Pick<User, 'id' | 'name' | 'email' | 'role'>
  action: AuditAction
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>
}

export interface ApiError {
  message: string | string[]
  statusCode: number
  error?: string
}

// Utility: extract error message from Axios error
export function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: ApiError } }
  const msg = err?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  if (typeof msg === 'string') return msg
  return 'An unexpected error occurred'
}
