# TODO — About-only cache sync micro-slice (backend)

- Ensure aboutUpsertSchema validation is strict and returns appropriate error details.
- Verify that PUT returns updatedAt and portrait path.
- Confirm that GET returns null when no record.
- Test auth guards: unauthenticated PUT → 401.
- Test invalid payload → 400 with validation errors.
- Ensure X-Replaced-Media-Key header is set when media replaced.
- Verify that mutation failure does not alter state.
- Confirm that the use-cases persist-first pattern is respected (though persistence is in infrastructure).
- Add integration tests for full replace and null scenarios.
