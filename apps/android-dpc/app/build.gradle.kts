import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

val mipApiProp = project.findProperty("mipApiBaseUrl") as String?
val labApiBaseUrl = mipApiProp ?: "http://10.0.2.2:3000/api/v1"
// Shop builds must pass -PmipApiBaseUrl=https://…/api/v1 (no lab LAN default).
val shopApiBaseUrl = mipApiProp ?: ""

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "com.mip.dpc"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.mip.dpc"
        minSdk = 26
        targetSdk = 34
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "channel"
    productFlavors {
        create("lab") {
            dimension = "channel"
            versionCode = 25
            versionName = "0.1.25-lab"
            buildConfigField("String", "API_BASE_URL", "\"$labApiBaseUrl\"")
            buildConfigField("boolean", "ALLOW_DEVELOPER_MODE", "true")
        }
        create("shop") {
            dimension = "channel"
            versionCode = 20
            versionName = "0.2.0-shop"
            buildConfigField("String", "API_BASE_URL", "\"$shopApiBaseUrl\"")
            buildConfigField("boolean", "ALLOW_DEVELOPER_MODE", "false")
        }
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("shopRelease") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("shopRelease")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    testImplementation("junit:junit:4.13.2")
}
