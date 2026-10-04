# Free VPS Hosting Options for Discord Bot (24/7)

This document compares various hosting providers for running a Discord bot that requires Node.js 18+, ~512MB RAM, and Linux.

## Comparison Table

| Provider | RAM | CPU | Storage | Uptime Guarantee | Cost | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Oracle Cloud Always Free** | 24 GB | 4 ARM Cores | 200 GB Block | Always Free | $0 | Credit card required. Must be used occasionally (30-day idle limit). |
| **AWS Free Tier** | 1 GB | 1 vCPU | 30 GB | 99.99% (12 mo) | $0 (12 mo) | t2.micro only. 750 hrs/month. |
| **Google Cloud Free Tier** | 1 GB | 1 vCPU | 30 GB | 99.99% | $0 | e2-micro only. 30 GB storage. |
| **Azure Free Tier** | 1 GB | 1 vCPU | 64 GB | 99.99% | $0 (12 mo) | B1S only. 750 hrs/month. |
| **Render** | 512 MB | 0.1 CPU | - | - | $0 | Spins down after 15 mins inactivity (not good for 24/7). |
| **Railway** | Custom | Custom | - | - | $5 trial | $5 credit. Must pay after credit is gone. |
| **Fly.io** | 256 MB | Shared | - | - | $0 | Legacy free tier only (3 shared VMs). New users get credit. |
| **Koyeb** | 512 MB | 0.5 vCPU | - | 99.9% | $0 | Free tier nano instance. 100 hours/month? (Check current terms). |
| **Hetzner** | 2 GB | 2 vCPU | 40 GB | 99.9% | €3.29/mo | Not free, but extremely cheap. |
| **Contabo** | 8 GB | 4 vCPU | 75 GB | 99.9% | €5.50/mo | Not free, but incredible value. |

## Detailed Breakdown

### 1. Oracle Cloud Always Free
- **Best for:** Long-term, high-performance free hosting.
- **Pros:** Most resources (4 ARM cores, 24GB RAM). Truly free forever.
- **Cons:** Complex setup. Can be hard to get ARM instances due to demand. Identity verification issues reported.
- **Deployment:** Ubuntu ARM instance -> Install Node.js -> PM2 for process management.

### 2. AWS Free Tier
- **Best for:** Users already familiar with AWS ecosystem.
- **Pros:** Industry standard. Reliable.
- **Cons:** Only free for 12 months. t2.micro is low power (1GB RAM).
- **Deployment:** EC2 -> Ubuntu 22.04 -> Security Group (Allow 443/80 or custom) -> SSH -> Node.js + PM2.

### 3. Google Cloud Free Tier
- **Best for:** Simple, reliable free hosting with Google infrastructure.
- **Pros:** e2-micro is always free. Easy to use.
- **Cons:** Very weak CPU (0.25 vCPU shared). 1GB RAM.
- **Deployment:** Compute Engine -> e2-micro -> SSH -> Setup environment.

### 4. Azure Free Tier
- **Best for:** Enterprise-focused users.
- **Pros:** 750 hrs/month B1S.
- **Cons:** Free for 12 months only.
- **Deployment:** Virtual Machines -> B1S -> Ubuntu -> SSH.

### 5. Render
- **Best for:** Simple web apps, but **NOT** for 24/7 bots.
- **Cons:** Free tier web services spin down after inactivity. Your bot will go offline.

### 6. Railway
- **Best for:** Quick deployment via GitHub.
- **Pros:** Very easy (Git push to deploy).
- **Cons:** $5 free credit is small. Will cost money eventually.

### 7. Fly.io
- **Best for:** Containerized apps.
- **Pros:** Global edge network.
- **Cons:** Free tier is mostly gone for new accounts (credit-based now).

### 8. Koyeb
- **Best for:** Serverless-style deployment.
- **Pros:** Free tier nano instance.
- **Cons:** Usage limits may apply.

### 9. Hetzner
- **Best for:** Best performance/cost ratio if you can pay ~$4.
- **Pros:** Excellent performance. European data center.
- **Cons:** Paid.

### 10. Contabo
- **Best for:** Maximum resources for minimum cost.
- **Pros:** 8GB RAM for €5.50 is unbeatable.
- **Cons:** Paid. Support can be slow.

## Recommendation

**Winner: Oracle Cloud Always Free**
For a Discord bot that needs to run 24/7 with decent performance (Node.js 18+), Oracle Cloud is the clear winner.
- **Why?** It's the only one offering substantial resources (4 ARM cores, 24GB RAM) completely free, forever.
- **Caveat:** Availability of ARM instances can be spotty.

**Runner Up: Contabo (if you can spend ~$6/month)**
If Oracle's free tier is unavailable or you want guaranteed performance, Contabo offers incredible value with 8GB RAM and 4 cores for €5.50/month.

## How to Deploy on Oracle Cloud (Recommended)

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/).
2. Create an ARM-based Ampere A1 instance (Always Free eligible).
3. Choose Ubuntu 22.04 or 24.04.
4. Upload SSH key.
5. SSH into the server: `ssh ubuntu@<public_ip>`
6. Install Node.js 18+: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
7. Install PM2: `sudo npm install -g pm2`
8. Clone your bot repo and run: `pm2 start index.js --name "discord-bot"`
9. Save PM2 process list: `pm2 save && pm2 startup`
