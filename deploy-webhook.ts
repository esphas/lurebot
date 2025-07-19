import express from "express";
import dotenv from "dotenv";

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync } from "fs";

dotenv.config({
  path: ".deploy.env",
});

const execAsync = promisify(exec);

interface WebhookConfig {
  port: number;
  secret: string;
  projectPath: string;
  restartCommand: string;
  logFile: string;
}

class DeployWebhook {
  private app = express();
  private isDeploying = false;
  constructor(private config: WebhookConfig) {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    this.app.get("/restart", async (req, res) => {
      try {
        await this.restartApplication();
        res.json({ success: true, message: "Restarted successfully" });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, error: error?.message || "Unknown error" });
      }
    });
    this.app.post("/deploy", async (req, res) => {
      try {
        const result = await this.handleDeploy(req.body);
        res.json(result);
      } catch (error) {
        this.log("Deploy error: " + error);
        res
          .status(500)
          .json({ success: false, error: error?.message || "Unknown error" });
      }
    });
  }

  private async handleDeploy(payload: { ref: string }) {
    const ref = payload.ref || "";
    console.log(payload);
    if (!ref.includes("refs/heads/main")) {
      return { success: true, message: "Not main branch, skipping deploy" };
    }
    if (this.isDeploying) {
      return { success: false, message: "Deploy already in progress" };
    }
    this.isDeploying = true;
    const startTime = Date.now();
    try {
      this.log(`开始部署...`);
      this.log(`切换到项目目录: ${this.config.projectPath}`);
      process.chdir(this.config.projectPath);
      const { stdout: prevCommitRaw } = await execAsync("git rev-parse HEAD");
      const prevCommit = prevCommitRaw.trim();

      const { stdout: resetOutput } = await execAsync("git reset --hard");
      this.log(`重置输出: ${resetOutput}`);
      const { stdout: pullOutput } = await execAsync("git pull origin main");
      this.log(`拉取输出: ${pullOutput}`);

      const { stdout: currentCommitRaw } =
        await execAsync("git rev-parse HEAD");
      const currentCommit = currentCommitRaw.trim();
      if (currentCommit === prevCommit) {
        this.log("没有代码变化，跳过部署");
        return {
          success: true,
          message: "No code changes, skipping deploy",
        };
      }
      const commitMessages = (
        await execAsync(`git log ${prevCommit}..${currentCommit} --pretty=%B`)
      ).stdout
        .trim()
        .split("\n")
        .filter((message) => message.trim() !== "")
        .map((message) => message.toLowerCase());
      const skipKeywords = ["#skip"];
      if (
        commitMessages.every((message) =>
          skipKeywords.some((keyword) => message.includes(keyword)),
        )
      ) {
        this.log("检测到 skip 关键字，跳过部署");
        return {
          success: true,
          message: "Skip deploy",
        };
      }

      const { stdout: diffOut } = await execAsync(
        `git diff --name-only ${prevCommit} ${currentCommit}`,
      );
      const diffFiles = diffOut.trim().split("\n");

      if (diffFiles.includes("package.json")) {
        this.log("检测到 package.json 变化，安装依赖...");
        const { stdout: installOutput } = await execAsync("npm install");
        this.log(`NPM install 输出: ${installOutput}`);
      }

      let restart = false;

      if (diffFiles.some((file) => !file.match(/^agents\/.*/))) {
        this.log("检测到 agents/ 目录之外的文件更新，需要重启");
        restart = true;
      }

      const restartKeywords = ["#restart", "#reboot", "#reload"];
      if (
        commitMessages.some((message) =>
          restartKeywords.some((keyword) => message.includes(keyword)),
        )
      ) {
        this.log("检测到 restart 关键字，需要重启");
        this.log(`相关 commit messages: ${commitMessages}`);
        restart = true;
      }

      if (restart) {
        this.log("重启应用...");
        await this.restartApplication();
      }
      const duration = Date.now() - startTime;
      this.log(`部署完成，耗时: ${duration}ms`);
      return {
        success: true,
        message: "Deploy completed successfully",
        restart,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.log(`部署失败: ${error}`);
      throw error;
    } finally {
      this.isDeploying = false;
    }
  }

  private async restartApplication() {
    try {
      const { stdout } = await execAsync(this.config.restartCommand);
      this.log(`重启输出: ${stdout}`);
    } catch (error) {
      this.log("重启失败，请手动检查应用");
      throw error;
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    try {
      writeFileSync(this.config.logFile, logMessage, { flag: "a" });
    } catch (error) {
      console.error("写入日志文件失败:", error);
    }
  }

  public start() {
    this.app.listen(this.config.port, () => {
      console.log(`部署 webhook 服务启动在端口 ${this.config.port}`);
      console.log(`健康检查: http://localhost:${this.config.port}/health`);
      console.log(`部署端点: http://localhost:${this.config.port}/deploy`);
    });
  }
}

const config: WebhookConfig = {
  port: Number(process.env.WEBHOOK_PORT) || 3001,
  secret: process.env.WEBHOOK_SECRET || "",
  projectPath: process.env.PROJECT_PATH || process.cwd(),
  restartCommand: process.env.RESTART_COMMAND || "pm2 restart lurebot",
  logFile: process.env.LOG_FILE || "./deploy.log",
};

const webhook = new DeployWebhook(config);
webhook.start();
