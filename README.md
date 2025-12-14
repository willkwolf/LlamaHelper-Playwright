# reto-testing-demoqa

## Description
This project implements end-to-end (E2E) test automation for the [DemoQA](https://demoqa.com) website using Playwright. It includes AI integration (Ollama and Llama 3.2) for error analysis and auto-repair of test failures.

## Repository Contents
- `master.md`: Project execution plan
- `tests/`: Directory with test files (01-text-box.spec.js, 02-practice-form.spec.js, 03-drag-drop.spec.js, 04-alerts.spec.js, 05-bookstore.spec.js)
- `helpers/ai-helper.js`: Helper for AI interactions with Ollama
- `auto-repair.js`: Script for automatic failure analysis and repair suggestions
- `playwright.config.js`: Playwright configuration file
- `run-tests.sh`: Bash script to orchestrate test execution and AI analysis
- `screenshots/`: Directory for test screenshots
- `reportes/`: Directory for auto-repair reports
- `playwright-report/`: HTML reports from Playwright

## Technology Stack
- Node.js (v18+)
- Playwright
- Ollama (Llama 3.2)
- VS Code MCP

## Study Objectives
- Learn to configure and run E2E tests with Playwright.
- Integrate local AI models for error analysis and correction suggestions.
- Develop skills in web test automation, selector handling, and reporting.

## What the Practice Achieves
- Complete automation of forms, drag-and-drop, and alerts on DemoQA.
- Generation of HTML and JSON reports of test results.
- Automatic failure analysis using AI, with suggestions to repair selectors and code.
- Screenshots and videos of failed tests for debugging.

## Project Phases
- Phase 1: Infrastructure and configuration
- Phase 2: Implementation of core tests
- Phase 3: Artificial intelligence and auto-repair
- Phase 4: Extension and closure

## Author
William Camilo Artunduaga Viana

## Installation and Execution
1. Install dependencies: `npm install`
2. Install Playwright: `npx playwright install --with-deps`
3. Configure Ollama and Llama 3.2 model.
4. Run tests: `npx playwright test`
5. For AI analysis: `node auto-repair.js`