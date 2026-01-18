# Product Guidelines

This document outlines the guidelines for the Swiper project, covering documentation, contributions, and communication.

## 1. Documentation

### Tone and Voice
The primary tone for all project documentation (including this document, `README.md`, and technical guides) will be **formal and technical**. The content should be precise, clear, and aimed at a developer audience.

A secondary goal is to eventually create a separate set of documentation for non-technical users. This documentation will adopt a **friendly and approachable** tone.

### Style
- All documentation will be written in Markdown.
- Code examples should be well-commented and follow the project's coding standards.

## 2. Development

### Contribution Workflow
All contributions to the codebase must be submitted via a **pull request (PR)**. Direct pushes to the `main` branch are not permitted. Each PR must be reviewed and approved by the project owner before being merged. This ensures code quality and consistency.

### Communication Style
Communication within the project (e.g., commit messages, PR descriptions, issue discussions) should be **concise and technically focused**. The goal is to convey information efficiently and clearly. Avoid ambiguity and provide specific details relevant to the topic.

## 3. User Experience

### Logging and Messaging
User-facing messages, such as console logs and error outputs, should adhere to the following principles:

- **Default Mode (Clear and Actionable):** By default, messages should be clear, easy to understand, and actionable. If an error occurs, the message should explain what went wrong and suggest a solution or next step for the user.

- **Debug Mode (Verbose):** The application will include a "Debug mode". When enabled, logging should be highly verbose, providing detailed information about the application's internal state, API responses, and other data useful for troubleshooting and development. The existing `-d, --debug` flag in the project already supports this.

## 4. Visual Identity

There are no specific visual identity guidelines for the project at this time. This may be revisited if the project evolves to include a graphical user interface.
