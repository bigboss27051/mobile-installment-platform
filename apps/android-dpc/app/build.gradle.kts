plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

val mipApiBaseUrl = (project.findProperty("mipApiBaseUrl") as String?)
    ?: "http://10.0.2.2:3000/api/v1"

android {
    namespace = "com.mip.dpc"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.mip.dpc"
        minSdk = 26
        targetSdk = 34
        versionCode = 19
        versionName = "0.1.19-lab"
        buildConfigField("String", "API_BASE_URL", "\"$mipApiBaseUrl\"")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
