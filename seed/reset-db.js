import { execSync } from "child_process";
import { Sequelize } from "sequelize";
import db from "../config/dababase.js";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const shouldSeed = args.includes("--seed");
const shouldSeedAll = args.includes("--seed-all");

const resetDatabase = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await db.authenticate();

    // Hapus seluruh file foto di uploads/payments/
    const uploadDir = path.join(process.cwd(), "uploads", "payments");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`  🗑️  Deleted file: ${file}`);
        }
      }
      console.log(`✅ Cleared ${files.length} file(s) from uploads/payments/`);
    } else {
      console.log("📁 Folder uploads/payments/ tidak ditemukan, skip hapus file.");
    }

    // Get all table names
    const [tables] = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );

    console.log(`📋 Found ${tables.length} tables`);

    // Disable FK checks
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    console.log("🔒 Foreign key checks disabled");

    // Drop all tables
    for (const table of tables) {
      const tableName = table.table_name || table.TABLE_NAME;
      await db.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`  🗑️  Dropped table: ${tableName}`);
    }

    // Re-enable FK checks
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("🔓 Foreign key checks re-enabled");

    // Sync all models
    console.log("\n🔄 Syncing database models...");
    await db.sync();
    console.log("✅ Database synced successfully!");

    // Seed data if requested
    if (shouldSeed || shouldSeedAll) {
      console.log("\n🌱 Running master seed...");
      execSync("node seed/seed.js", { stdio: "inherit" });

      if (shouldSeedAll) {
        console.log("\n🌱 Running order seed...");
        execSync("node seed/seed-orders.js", { stdio: "inherit" });
      }
    }

    console.log("\n🎉 Database reset completed!");

    if (!shouldSeed && !shouldSeedAll) {
      console.log("\n💡 To seed data, run:");
      console.log("   node seed/reset-db.js --seed     (master data only)");
      console.log("   node seed/reset-db.js --seed-all (master + orders)");
    }

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Reset error:", err.message);
    process.exit(1);
  }
};

resetDatabase();
