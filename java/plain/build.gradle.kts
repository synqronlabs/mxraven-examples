import org.gradle.jvm.toolchain.JavaLanguageVersion

plugins {
    application
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.mxraven:mail:2.0.4")
}

application {
    mainClass = "com.mxraven.examples.plain.Main"
}

// The installed JDK is 21 (the Java 25 runtime is a JRE), so pin the toolchain
// and compile with --release 17 for the SDK's baseline.
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 17
}
