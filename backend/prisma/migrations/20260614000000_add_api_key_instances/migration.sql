-- CreateTable
CREATE TABLE "api_key_instances" (
    "api_key_id" TEXT NOT NULL,
    "instance_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_instances_pkey" PRIMARY KEY ("api_key_id","instance_id")
);

-- AddForeignKey
ALTER TABLE "api_key_instances" ADD CONSTRAINT "api_key_instances_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_instances" ADD CONSTRAINT "api_key_instances_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
