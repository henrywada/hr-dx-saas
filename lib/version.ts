import packageJson from "../package.json";

export function getVersionInfo() {
    return {
        version: packageJson.version,
        environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
        buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ||
            new Date().toISOString().split("T")[0],
    };
}

export function getVersionString(): string {
    const { version, environment, buildTime } = getVersionInfo();
    return `v${version} | ${buildTime} | ${environment}`;
}
