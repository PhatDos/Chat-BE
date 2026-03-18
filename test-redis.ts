import "dotenv/config";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
//   tls: { servername: "redis-19838.c256.us-east-1-2.ec2.cloud.redislabs.com" } 
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

async function test() {
  try {
    await redis.set("test-key", "hello");
    const value = await redis.get("test-key");

    console.log("Redis OK:", value);
    process.exit(0);
  } catch (err) {
    console.error("Redis FAIL:", err);
    process.exit(1);
  }
}

test();