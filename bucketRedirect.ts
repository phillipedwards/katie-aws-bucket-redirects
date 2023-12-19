import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface BucketRedirectArgs {
    domainName: string;
    zoneId: string;
    tags: { [key: string]: string };
    targetHostName?: string;
}

export class BucketRedirect extends pulumi.ComponentResource {
    constructor(name: string, args: BucketRedirectArgs, opts?: pulumi.ComponentResourceOptions) {
        super("katie:site:bucketRedirects", name, args, opts);

        const hostName = args.targetHostName ? args.targetHostName : "beyondlocalrealestate.com";

        const options: pulumi.CustomResourceOptions = { parent: this, deleteBeforeReplace: true };
        const bucket = new aws.s3.BucketV2(`${name}-bucket`, {
            bucket: args.domainName,
            tags: args.tags,
        }, options);

        const bucketOwnerControls = new aws.s3.BucketOwnershipControls(`${name}-bucket-control`, {
            bucket: bucket.id,
            rule: {
                objectOwnership: "BucketOwnerPreferred",
            },
        }, options);

        const bucketPublicAccess = new aws.s3.BucketPublicAccessBlock(`${name}-bucket-access`, {
            bucket: bucket.id,
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
        }, options);

        const aclOptions = pulumi.mergeOptions(options, { dependsOn: [bucketOwnerControls, bucketPublicAccess] });
        new aws.s3.BucketAclV2(`${name}-acl`, {
            bucket: bucket.bucket,
            acl: "public-read",
        }, aclOptions);

        const websiteConfig = new aws.s3.BucketWebsiteConfigurationV2(`${name}-website-conf`, {
            bucket: bucket.id,
            redirectAllRequestsTo: {
                hostName: hostName,
                protocol: "https",
            },
        }, options);

        new aws.route53.Record(`${name}-r53-a`, {
            name: args.domainName,
            type: "A",
            zoneId: args.zoneId,
            aliases: [{
                name: websiteConfig.websiteDomain,
                zoneId: bucket.hostedZoneId,
                evaluateTargetHealth: false
            }],
        }, options);
    }
}