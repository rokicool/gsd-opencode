<objective>
Extend the existing GitHub Actions CI pipeline to support automated nightly builds and production releases. The current pipeline only does basic validation on every push. We need to add:
1. Nightly builds that run comprehensive tests and create artifacts
2. Production release pipeline triggered by git tags that deploys to production

This will enable continuous delivery with proper artifact management and release automation.
</objective>

<context>
The project is a Node.js-based CLI tool called "gsd-opencode" with an existing CI pipeline in `.github/workflows/ci.yml`. The current pipeline:
- Runs on every push to any branch
- Validates Node.js syntax and package.json
- Checks GSD compliance (file structure, naming conventions, anti-patterns)
- Works primarily with markdown files and shell scripts

The new workflows should:
- Preserve all existing validation logic
- Add nightly comprehensive builds (2 AM UTC)
- Add production releases on git tags (v*.*.* pattern)
- Create proper build artifacts
- Maintain the GSD compliance standards

Existing CI pipeline: @.github/workflows/ci.yml
Project structure: @gsd-opencode/
</context>

<requirements>
1. **Nightly Build Workflow**:
   - Trigger: Daily at 2 AM UTC
   - Run all existing validation checks
   - Add comprehensive test suite
   - Build and package the CLI tool
   - Create build artifacts (tarball, checksums)
   - Upload artifacts with retention period
   - Send notifications on build status

2. **Production Release Workflow**:
   - Trigger: Git tags matching v*.*.* pattern
   - Run all validation and tests
   - Build production artifacts
   - Create GitHub release with artifacts
   - Update version information
   - Deploy to production (if applicable)
   - Send release notifications

3. **Shared Components**:
   - Extract common validation steps into reusable workflow
   - Maintain consistency across all workflows
   - Use proper caching for dependencies
   - Implement proper error handling and notifications

4. **Artifact Management**:
   - Generate proper versioned artifacts
   - Create SHA256 checksums
   - Maintain artifact naming conventions
   - Set appropriate retention policies

5. **Security & Best Practices**:
   - Use least privilege for secrets
   - Implement proper signing if needed
   - Add workflow protections
   - Include proper logging and audit trails
</requirements>

<implementation>
1. **Preserve existing CI**: The current ci.yml should remain unchanged for backward compatibility

2. **Create reusable workflow**: Extract common validation logic into `.github/workflows/validate.yml`

3. **Nightly build workflow**: Create `.github/workflows/nightly.yml` with:
   - Schedule trigger at 2 AM UTC
   - Call reusable validation workflow
   - Add comprehensive testing steps
   - Build and artifact creation steps

4. **Production release workflow**: Create `.github/workflows/release.yml` with:
   - Tag-based trigger
   - Enhanced validation and testing
   - Artifact creation and GitHub release
   - Version management

5. **Dependencies**:
   - Use GitHub Actions caching for Node.js modules
   - Leverage existing Node.js 18 setup
   - Use official GitHub Actions for releases

**Important constraints**:
- Never modify the existing ci.yml workflow
- All new workflows must call the same validation logic
- Maintain GSD compliance checking in all workflows
- Use semantic versioning for releases
- Include proper error handling for each step
- All paths should be relative to repository root
</implementation>

<output>
Create/modify the following files:

- `.github/workflows/validate.yml` - Reusable validation workflow extracted from existing ci.yml
- `.github/workflows/nightly.yml` - Nightly build workflow with comprehensive testing and artifact creation
- `.github/workflows/release.yml` - Production release workflow triggered by git tags

Each workflow file should:
- Use proper GitHub Actions syntax (YAML)
- Include clear step descriptions
- Handle errors appropriately
- Use environment variables for configuration
- Include logging for debugging
</output>

<verification>
Before declaring complete, verify your work:

1. **Syntax validation**:
   - Run `yamllint .github/workflows/*.yml` (if available) or validate YAML syntax manually
   - Ensure all required fields are present (name, on, jobs, etc.)

2. **Workflow structure verification**:
   - Check that validate.yml contains all existing validation logic
   - Verify nightly.yml and release.yml properly call validate.yml
   - Ensure triggers are correct (schedule, push tags)

3. **Artifact creation verification**:
   - Confirm build steps create proper artifacts
   - Verify checksums are generated correctly
   - Check artifact upload paths and retention

4. **Security review**:
   - Ensure no hard-coded secrets
   - Verify proper use of GitHub contexts
   - Check that permissions are appropriately scoped

5. **Test workflow logic**:
   - Review that all steps have proper error handling
   - Verify conditional logic for triggers
   - Check that notifications are sent appropriately
</verification>

<success_criteria>
The pipeline extension is successful when:

1. **Nightly builds** run automatically at 2 AM UTC and create downloadable artifacts
2. **Production releases** are triggered by git tags and create proper GitHub releases
3. **All validation logic** from the original CI pipeline is preserved and reused
4. **Artifacts** are properly versioned, checksummed, and uploaded
5. **Workflows** follow GitHub Actions best practices and security guidelines
6. **GSD compliance** checking remains intact across all workflows
7. **Error handling** provides clear feedback for debugging
8. **Documentation** in workflow comments explains the purpose of each step
</success_criteria>