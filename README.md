# Zanalyze

Dealing with email content for analysis can be a frustrating experience. Raw EML files are often cluttered with signatures, disclaimers, lengthy reply chains, and complex formatting – a lot of "nonsense" that gets in the way of understanding the core message. Zanalyze is designed to tackle this challenge head-on. It's a tool built to proactively clean and simplify the content extracted from EML files, transforming them into a more manageable and analysis-ready format. By stripping away the unnecessary noise, Zanalyze helps you focus on the valuable information within your emails, making the entire experience of working with email data much more efficient and insightful.

## Getting Started

To get started with Zanalyze quickly, you can use `dlx` (part of Node.js/npm) to run it without needing to clone the repository or install it globally. You will also need to ensure your OpenAI API key is available as an environment variable.

1.  **Set your OpenAI API Key:**
    Zanalyze uses OpenAI models for its classification and potentially other AI-driven tasks. You need to have an OpenAI API key and make it available to the application. The recommended way is to set the `OPENAI_API_KEY` environment variable:

    ```bash
    export OPENAI_API_KEY="your_openai_api_key_here"
    ```

    Also note that zanalyze will attempt to load environment files from a .env file with dotenv.

2.  **Run Zanalyze with `dlx`:**
    Open your terminal and use the following command structure. Replace `your-package-name` with the actual npm package name for Zanalyze once it's published. You'll also need to specify your input and output directories.

    ```bash
    dlx your-package-name --inputDirectory /path/to/your/eml_files --outputDirectory /path/to/your/output
    ```

    For example, if your EML files are in `./my_emails` and you want the output in `./processed_emails`:

    ```bash
    dlx your-package-name --inputDirectory ./my_emails --outputDirectory ./processed_emails
    ```

3.  **Configure Further (Optional):**
    While the command above will run with default settings, Zanalyze offers various configuration options to tailor its behavior to your needs. These include setting different AI models, defining filters, and controlling simplification. For a comprehensive list of options and how to set them using a `config.yaml` file or further command-line arguments, please refer to the [Configuration](#configuration) section.

    For instance, to use a specific configuration file, you might run:

    ```bash
    dlx your-package-name --config /path/to/your/config.yaml --inputDirectory ./my_emails --outputDirectory ./processed_emails
    ```

This should give users a straightforward way to try out Zanalyze and then delve into more advanced configurations as needed.


## Assumptions and Workflow

Zanalyze is designed to fit into a broader email processing pipeline and makes a few key assumptions about how you'll use it:

1.  **Pre-existing EML Files:** Zanalyze expects that you have already exported your emails from their source (e.g., Gmail, Outlook) into a directory structure containing individual EML files. Tools like [`@vortiq/gmlift`](https://www.npmjs.com/package/@vortiq/gmlift) (for Gmail) can be used for this initial export step.

2.  **Input Directory Structure:** While Zanalyze can process EMLs from a flat directory, it works best with a structured input, particularly when using date-based processing. The default input (and output) structure is `"month"`. This means Zanalyze expects your EML files to be organized into subdirectories by year and then by month. For example:

    ```
    <input_directory_root>/
    ├── 2023/
    │   ├── 01/ (January)
    │   │   ├── email1.eml
    │   │   └── email2.eml
    │   ├── 02/ (February)
    │   │   └── email3.eml
    │   └── ...
    └── 2024/
        ├── 01/ (January)
        │   └── email4.eml
        └── ...
    ```

    This structure allows Zanalyze to efficiently locate and process emails based on date ranges.

### From Raw EMLs to Processed Insights

The core purpose of Zanalyze is to take this potentially large and messy collection of EML files from your input directory and transform it into a more manageable and analyzable set of outputs in a corresponding output directory. The output directory will mirror the chosen structure (e.g., `"month"`) and will contain:

*   **Processed Files:** The simplified and filtered content derived from your EMLs (the exact format might depend on later stages in your pipeline, but Zanalyze prepares the clean content).
*   **Context Files:** For each processed email, Zanalyze generates associated metadata and context in hidden subdirectories (e.g., `.context/`, `.detail/'). These files store information like extracted email headers, classification details, and other processing artifacts, which can be invaluable for auditing, debugging, or further analysis.

An example of what an output directory might look like (assuming a "month" structure and JSON as an illustrative output format for processed data):

    ```
    <output_directory_root>/
    ├── 2023/
    │   ├── 01/ (January)
    │   │   ├── <hash1>_output_some_subject.json
    │   │   ├── .context/
    │   │   │   └── <hash1>_context_some_subject.json
    │   │   ├── <hash2>_output_another_subject.json
    │   │   ├── .context/
    │   │   │   └── <hash2>_context_another_subject.json
    │   │   └── ...
    │   └── ...
    └── 2024/
        └── ...
    ```

### A Focused Tool in a Larger Chain

It's important to view Zanalyze as a specialized tool focused on the initial cleaning, simplification, and classification of email content. It's designed to be a crucial first step in a more comprehensive data processing and analysis pipeline. The structured and cleaned output from Zanalyze is intended to be consumed by other tools or processes that might perform tasks like advanced analytics, data visualization, or integration into knowledge bases.


## How Emails are Processed in Zanalyze

The email processing system in Zanalyze works in a sequence of steps to understand and organize your emails. Each step builds upon the last, ensuring emails are handled efficiently and categorized correctly. Here's what happens to an email as it goes through the system:

### 1. Identifying and Organizing the Email (Locate Phase)

First, the system takes an incoming email and figures out basic information about it, like when it was sent and what it's called. It then organizes the email and its details in a structured way so that it can be easily found and worked on by later steps. Think of this as creating a well-organized digital file for each email.

### 2. Extracting Key Information (Simplify Phase)

Next, the system takes the raw email and makes it easier to understand. It extracts the most important content, similar to how you might skim an email for its main points. This step helps to focus on what's essential, clearing away clutter like complex formatting or less relevant details, so the system can work with the core message more effectively.

### 3. Deciding What's Important (Filter Phase)

After the email has been simplified, the system decides if this particular email needs further attention. Based on rules and criteria, it determines if the email is relevant or important enough to continue processing. This ensures that only meaningful emails proceed to the final step, saving time and resources.

### 4. Understanding and Categorizing the Email (Classify Phase)

Finally, for emails that are deemed important, the system analyzes their content to understand what they are about. It then assigns one or more categories or labels to the email. This helps in understanding the purpose or topic of the email, for example, whether it's an invoice, a customer inquiry, or a project update, and how confidently the system has made this determination.

## Configuration

Zanalyze's behavior can be customized through a `config.yaml` file and/or command-line arguments. Command-line arguments will always override values specified in the configuration file, which in turn override the application defaults.

The primary configuration options are defined by `ConfigSchema` and are as follows:

*   `dryRun` (boolean, default: `false`): If `true`, the application will run through all steps but will not write any output files or make changes. Useful for testing configuration. (CLI: `--dry-run`)
*   `verbose` (boolean, default: `false`): Enables verbose logging output. (CLI: `--verbose`)
*   `debug` (boolean, default: `false`): Enables debug logging output, which is more detailed than verbose. (CLI: `--debug`)
*   `silly` (boolean, default: `false`): Enables the most detailed level of logging, including potentially sensitive information. (CLI: `--silly`)
*   `model` (string, default: `gpt-4o`): Specifies the primary AI model to be used for tasks like summarization or general processing. (CLI: `--model <model_name>`)
*   `classifyModel` (string, default: `gpt-4o-mini`): Specifies the AI model used specifically for the classification phase. Can be set to a different, possibly faster or cheaper, model if desired.
*   `overrides` (boolean, default: `false`): If `true`, allows certain operations to override existing data or settings. The specific behavior depends on the context where this override is checked. (CLI: `--overrides`)
*   `contextDirectories` (array of strings, optional): A list of directory paths where the system can find additional context files. These files might be used to provide more information to the AI models. (CLI: `--context-directories <path1> <path2> ...`)
*   `replace` (boolean, default: `false`): If `true`, existing output files (e.g., summaries) will be replaced during processing. If `false`, existing files will be skipped. (CLI: `--replace`)

### Simplify Options (`simplify`)

These options control how email content is simplified. In `config.yaml`, they are nested under a `simplify:` key.

*   `headers` (array of strings, optional): A list of email header keys (regex supported) to retain. If not specified, a default list of common headers is used. All other headers are removed during the simplify phase.
*   `textOnly` (boolean, default: `true`): If `true`, only the plain text body of the email will be processed. HTML content will be ignored.
*   `skipAttachments` (boolean, default: `true`): If `true`, email attachments will not be processed or included in the simplified output.

### Filter Options (`filters`)

These options define criteria for including or excluding emails from processing. In `config.yaml`, they are nested under a `filters:` key.

*   `include` (object, optional): Defines conditions for emails to be **included**. Emails matching these criteria will be processed.
    *   `subject` (array of strings, optional): List of keywords/phrases (regex supported) to match in the email subject.
    *   `to` (array of strings, optional): List of recipient email addresses/domains (regex supported) to match.
    *   `from` (array of strings, optional): List of sender email addresses/domains (regex supported) to match.
*   `exclude` (object, optional): Defines conditions for emails to be **excluded**. Emails matching these criteria will be skipped, even if they match `include` filters.
    *   `subject` (array of strings, optional): List of keywords/phrases (regex supported) to match in the email subject for exclusion.
    *   `to` (array of strings, optional): List of recipient email addresses/domains (regex supported) to match for exclusion.
    *   `from` (array of strings, optional): List of sender email addresses/domains (regex supported) to match for exclusion.

**Note:** Additional configuration options related to input/output paths, file naming conventions, timezone, and the location of the configuration file itself are also available, primarily managed through command-line arguments and the underlying `dreadcabinet` and `cardigantime` libraries.
