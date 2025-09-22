
# AI Coding Partner - Context Management Instructions

## Purpose
These files and instructions are designed to help you, my AI coding partner (App Prototyper), maintain context and understanding of the "Stellar Conquest" project between our interaction sessions. This should lead to more efficient and accurate assistance.

## Context Files Overview
Located in the `context/` directory:

1.  **`PROJECT_CONTEXT_HISTORY.md`**:
    *   **Content:** A running summary of our project's goals, key features (from PRD and discussions), significant decisions made, major completed tasks/milestones, and planned future work.
    *   **Purpose:** Provides a narrative history and a high-level understanding of the project's evolution and current state.

2.  **`PROJECT_PROGRESS.md`**:
    *   **Content:** A list of tasks categorized under "DONE", "WORKING", and "NEXT".
    *   **Purpose:** Offers a quick snapshot of what has been accomplished, what is currently in progress, and what the upcoming priorities are.

3.  **`1st.md`**:
    *   **Content:** An initialization prompt that I (the user) will provide to you at the beginning of each new session.
    *   **Purpose:** To explicitly instruct you to load and process the information from the other context files.

4.  **`PROJECT_INSTRUCTIONS.md`** (This file):
    *   **Content:** Guidelines on how you should use and help maintain these context files.
    *   **Purpose:** To ensure consistent and effective use of this context persistence system.

## Your Role & Responsibilities

1.  **Session Initialization:**
    *   When I start a new session and provide you with the content of `1st.md`, you **MUST** read and process the information in:
        *   `PROJECT_CONTEXT_HISTORY.md`
        *   `PROJECT_PROGRESS.md`
        *   `PROJECT_INSTRUCTIONS.md` (this file, for a reminder)
    *   Acknowledge that you have processed this information before we proceed.

2.  **Active Context Usage:**
    *   Throughout our session, refer to the information in these files to inform your suggestions, code generation, and planning.
    *   For example, if I ask about a feature, you should recall its description or status from `PROJECT_CONTEXT_HISTORY.md` or `PROJECT_PROGRESS.md`.

3.  **Maintaining Context Files (Proactive Updates):**
    *   **`PROJECT_CONTEXT_HISTORY.md`**:
        *   After we have a significant discussion, make a key design decision, complete a major feature, or change project direction, you should **propose an update** to this file.
        *   The update should be a concise summary of what was discussed or achieved.
    *   **`PROJECT_PROGRESS.md`**:
        *   When a task moves from "WORKING" to "DONE", or from "NEXT" to "WORKING", you should **propose an update** to this file.
        *   If new tasks are identified for the "NEXT" category, also propose adding them.
    *   When proposing updates, generate the complete new content for the file using the `<changes>` XML format.

4.  **Responding to Prompts for Updates:**
    *   If I explicitly ask you to update one of these files, please do so by generating the new file content in the XML format.

5.  **Clarity and Conciseness:**
    *   Keep summaries and progress notes clear and to the point. The goal is to provide useful context quickly.

## User's Role

*   I will provide the content of `1st.md` at the start of new sessions.
*   I will review your proposed updates to the context files and confirm or request modifications.
*   I may occasionally remind you to update the files if a significant event occurs and you haven't proposed an update.

By following these instructions, we can build a more robust "memory" for our collaborative project development. Thank you!
