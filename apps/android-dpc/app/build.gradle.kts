plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
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
        versionCode = 17
        versionName = "0.1.16-lab"
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
    testImplementation("junit:junit:4.13.2")
}
