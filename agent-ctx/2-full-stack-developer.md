---
Task ID: 2
Agent: full-stack-developer
Task: Build Buyer Contacts CRM Sheet

Work Log:
- Created `/home/z/my-project/src/components/contacts/ContactsSheet.tsx` — full CRUD UI for buyer contacts
- Bottom sheet (Radix, side="bottom", rounded-t-2xl, max-h-[90vh]) filtered to specific laptop
- Add Contact form: collapsible section with Name (required), Phone, Email, Platform (Select), Message (Textarea)
- Contact cards: status badge (color-coded from CONTACT_STATUSES), name, platform icon, phone (tel: link), email (mailto: link), message preview (truncated), time ago
- Status dropdown (Select) on each card to change status inline
- Delete button (ghost, red) on each card with toast notification
- Empty state: Users icon + "No buyer enquiries yet" message
- Contact count badge in sheet header
- Emerald gradient bottom line (matching other sheets)
- Framer Motion animations: form collapse/expand, contact card enter/exit
- Dark mode support with dark: variants throughout
- Integrated into `page.tsx` (import + render alongside other sheets)
- Added "Buyers" button to `LaptopDetailSheet.tsx` action buttons area (Users icon, opens contacts sheet)
- Store already had all needed CRUD actions and state (isContactsSheetOpen, contactsSheetLaptopId, etc.)

Files Created:
- `src/components/contacts/ContactsSheet.tsx` (~320 lines)

Files Modified:
- `src/app/page.tsx` — added ContactsSheet import and render
- `src/components/laptop/LaptopDetailSheet.tsx` — added Buyers button + handleOpenContacts

Verification:
- ESLint: 0 new errors/warnings in src/ files
- Dev server: GET / 200, all compiles successful
- All existing store selectors and handlers were already in place
