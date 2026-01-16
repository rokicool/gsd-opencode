<objective>
Create a GitHub Actions CI/CD pipeline with validate_code and validate_gsd jobs that runs on every push to any branch. The pipeline should ensure code quality and GSD compliance for this Node.js/JavaScript project.
</objective>

<context>
This is a Node.js project called "gsd-opencode" - a meta-prompting and context engineering system. The pipeline needs to:
- Run validate_code job for JavaScript/Node.js linting and formatting checks
- Run validate_gsd job to verify compliance with GSD-STYLE.md guidelines
- Execute on every push to any branch
- Use appropriate Node.js version (>=16.7.0 as specified in package.json)

The project structure includes:
- Main package in gsd-opencode/ directory
- GSD-STYLE.md documentation with style guidelines
- No existing GitHub Actions workflows
</context>

<requirements>
Create a complete GitHub Actions workflow with:

1. **validate_code job**:
   - Set up Node.js environment (version >=16.7.0)
   - Install dependencies from gsd-opencode/package.json
   - Run linting/formatting checks (consider common Node.js tools like ESLint, Prettier)
   - Fail if code doesn't meet quality standards

2. **validate_gsd job**:
   - Check compliance with GSD-STYLE.md guidelines
   - Validate file structure follows GSD conventions
   - Verify any GSD-specific formatting or content requirements
   - Read and apply rules from gsd-opencode/GSD-STYLE.md

3. **Workflow configuration**:
   - Trigger on push to any branch
   - Jobs can run in parallel (no dependencies)
   - Use appropriate action versions
   - Clear error messages and logging

4. **Best practices**:
   - Use specific action versions (not latest)
   - Proper caching for node_modules if beneficial
   - Clear job names and descriptions
   - Handle edge cases gracefully
</requirements>

<implementation>
Examine the existing project structure and GSD-STYLE.md to understand specific validation requirements. Look for any existing linting configuration files or scripts that should be integrated.

The workflow should be production-ready with proper error handling and clear feedback for developers.
</implementation>

<output>
Create GitHub Actions workflow file:
- `.github/workflows/ci.yml` - Complete CI pipeline with validate_code and validate_gsd jobs
</output>

<verification>
Before completing, verify:
- Workflow YAML syntax is valid
- Both jobs are properly defined with correct steps
- Triggers are configured for "any push to any branch"
- Node.js version matches project requirements (>=16.7.0)
- Jobs reference correct file paths (gsd-opencode/ directory)
- GSD compliance checks align with GSD-STYLE.md content
</verification>

<success_criteria>
- Workflow runs successfully on push to any branch
- validate_code job properly checks Node.js code quality
- validate_gsd job validates GSD-STYLE.md compliance
- Both jobs provide clear feedback on failures
- Pipeline completes within reasonable time
- No syntax errors in workflow YAML
</success_criteria>