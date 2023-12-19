import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { BucketRedirect } from "./bucketRedirect";

export = async () => {
    const awsConfig = new pulumi.Config("aws");
    const awsProvider = new aws.Provider("aws", {
        profile: awsConfig.require("profile"),
        region: <aws.Region>awsConfig.require("region"),
    });

    // retrieve the domains and ultimately the zone ids of the resources we need
    // this assumes each 'domain' will map exactly to the HostedZoneName
    const config = new pulumi.Config();
    const domains = <string[]>config.requireObject("domains");
    const zones: aws.route53.GetZoneResult[] = [];
    for (const domain of domains) {
        const zone = await aws.route53.getZone({
            name: domain
        }, { provider: awsProvider });

        zones.push(zone);
    }

    for (const zone of zones) {
        new BucketRedirect(zone.name, {
            domainName: zone.name,
            zoneId: zone.id,
            tags: { "customer": "beyond-local-re" },
        }, { provider: awsProvider });

        new BucketRedirect(`www-${zone.name}`, {
            domainName: `www.${zone.name}`,
            zoneId: zone.id,
            tags: { "customer": "beyond-local-re" },
        }, { provider: awsProvider });
    }
};