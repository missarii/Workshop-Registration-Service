# Workshop Registration Service — Design Decisions

## Technology choices

The application uses React, TypeScript, and Vite for a responsive staff dashboard, with NestJS providing a modular REST API. PostgreSQL is the primary datastore, and Prisma manages schema migrations and type-safe database access. Docker Compose provides a reproducible local development environment. 

## Architecture and access control

The application separates authentication, user management, workshop management, registrations and audit history into backend modules. 
- **Admins** can manage user accounts and roles.
- **Managers** can manage workshops and registrations.
- **Staff** can register and cancel attendees and view workshop information. 

Authorization is enforced by backend guards (`RolesGuard`), independently of frontend navigation. The initial Admin is created through a seed script, and public account registration is disabled.

## Preventing over-registration

Seat allocation uses a PostgreSQL transaction with an atomic conditional update. A registration is created only after a seat is successfully reserved, and the registration and audit record commit together. This completely avoids the race condition of reading capacity and writing a registration independently. 

```sql
UPDATE workshops
SET reserved_seats = reserved_seats + 1
WHERE id = $1
  AND status = 'SCHEDULED'
  AND reserved_seats < capacity
```

Cancellation releases a seat exactly once in the same transaction as the cancellation status change. 

## Data and registration history

Registrations store attendee details, registration status, the responsible staff member and timestamps. Cancellations update the existing record rather than deleting it. Audit records capture relevant business actions and their actors.

## Search and user experience

The dashboard supports availability filters. Capacity indicators show remaining seats, and clear validation and conflict messages help staff resolve full-workshop requests quickly. The frontend features a unified design language with modern styling elements.

## Trade-offs and omissions
- **Message Broker / Kafka / Redis:** Omitted for simplicity and because PostgreSQL transactions adequately resolve the concurrency requirement without adding infrastructure complexity for this specific use case.
- **Pagination:** Simple `skip`/`take` implemented for Audit Logs, but full cursor-based pagination omitted to save time.
- **Waitlist:** Database enum has `WAITLISTED` status ready, but automated promotion logic was omitted to focus entirely on bulletproofing the core active registration and cancellation flows within the 3-hour limit.
