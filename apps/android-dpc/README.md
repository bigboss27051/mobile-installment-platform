# MIP DPC

Lab Android Device Policy Controller (`com.mip.dpc`). It reads `enrollmentSessionId`, `enrollmentToken`, and `enrollmentEndpoint` from the provisioning extras and POSTs check-in. It does not lock the device.

Admin component: `com.mip.dpc/com.mip.dpc.MipDeviceAdminReceiver`

Set `DPC_COMPONENT_NAME` to that component. The check-in URL in the QR must be HTTPS. Do not factory-reset a phone without asking. A successful build is not a production Device Owner claim.

```bash
cd apps/android-dpc
./gradlew test
./gradlew assembleDebug
```
