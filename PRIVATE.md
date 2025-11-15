# Private/Proprietary Code

This repository uses a **hybrid open-source approach**. The following components are **proprietary** and not part of the open-source license:

## Closed Source Components

### Payment Processing
- `app/api/create-checkout/route.ts` - Stripe checkout session creation
- `app/api/webhook/stripe/route.ts` - Stripe webhook handler for subscription management
- `lib/stripe-helpers.ts` - Stripe subscription synchronization logic
- `app/api/debug-promo-code/route.ts` - Promotion code debugging utilities
- `app/upgrade/page.tsx` - Upgrade flow UI and payment integration

### Proprietary Algorithms
- Advanced AI prompt engineering and system instructions
- Performance scoring algorithms
- Recommendation engine logic (if implemented)

### Advanced Features
- Analytics and tracking implementation details
- Custom business logic for subscription management
- Internal API endpoints for admin operations

## Open Source Components

The following are fully open source under MIT license:

- Core UI components (`components/`)
- Authentication flow (`app/auth/`, `app/login/`)
- Interview functionality (`app/interview/`, `app/sessions/`)
- Basic dashboard (`app/account/`, `app/dashboard/`)
- API routes for chat and feedback (`app/api/chat/`, `app/api/generate-feedback/`)
- Configuration and utilities (`lib/config.ts`, `lib/types.ts`, `lib/firestore-helpers.ts`)
- Documentation and setup guides

## License

- **Open Source Components**: MIT License
- **Proprietary Components**: All Rights Reserved

For questions about licensing or access to proprietary components, contact support@mockmate.dev

