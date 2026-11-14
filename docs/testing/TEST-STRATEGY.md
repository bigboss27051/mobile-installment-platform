# Test Strategy (Phase 0 Draft)

## Pyramid

1. **Unit** — schedule math, scorecard pure functions, policy threshold evaluation  
2. **Integration** — Nest modules + Postgres + Redis; webhook processing  
3. **API** — contract tests from OpenAPI  
4. **E2E** — critical journeys (apply → approve → contract → pay)  
5. **Mobile** — Bloc tests + widget tests  
6. **DPC / MDM** — instrumented tests where possible; device farm/manual for DO, QR enroll, Configurator/ADE; never claim pass without hardware notes  
7. **Load** — payment webhook and auth endpoints before production  

## Mandatory gates

- Tenant isolation suite green  
- Flat + reducing golden fixtures green  
- Webhook replay does not double-allocate  
- Unauthorized device command denied  
- Enrollment token expiry / reuse / cross-tenant bind denied  
- Device webhook/event replay does not duplicate devices  

## Evidence

Each phase report must include commands run + results summary.
