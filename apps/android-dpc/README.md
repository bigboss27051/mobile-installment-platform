# MIP DPC

Lab Android Device Policy Controller (`com.mip.dpc`). It reads `enrollmentSessionId`, `enrollmentToken`, and `enrollmentEndpoint` from the provisioning extras and POSTs check-in. It does not lock the device.

Admin component: `com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver`

Android 12+ QR Device Owner also requires exported activities for `GET_PROVISIONING_MODE` (fully managed) and `ADMIN_POLICY_COMPLIANCE` (finish with `RESULT_OK`). Without those, Setup Wizard shows "Can't set up device" after the organisation screen.

Enrollment extras are persisted at `GET_PROVISIONING_MODE` / admin-enabled so `ADMIN_POLICY_COMPLIANCE` can still check in if the compliance intent omits the bundle. Check-in runs before `RESULT_OK`, with a short timeout so Setup Wizard is not blocked forever.

Set `DPC_COMPONENT_NAME` to that component. The check-in URL in the QR must be HTTPS. Do not factory-reset a phone without asking. A successful build is not a production Device Owner claim.

```bash
cd apps/android-dpc
./gradlew test
./gradlew assembleDebug
```
