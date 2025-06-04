import { db } from "../libs/db.js";
import { getJudge0LanguageId, pollBatchResults } from "../libs/judge0.lib.js";

export const createProblem = async (req, res) => {
  // going to get all the data from the request body
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
  } = req.body;

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: "You are not authorized to create a problem",
    });
  }

  try {
    for (const [languages, solutionCode] of Object.entries(
      referenceSolutions
    )) {
      const languageId = getJudge0LanguageId(languages);
      if (languageId === null) {
        return res.status(400).json({
          success: false,
          error: `Unsupported language: ${languages}`,
        });
      }
      const submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));

      const submissionResults = await submitBatch(submissions);

      const tokens = submissionResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status.id !== 3) {
          // 3 means Accepted
          return res.status(400).json({
            success: false,
            error: `Testcase ${i + 1} failed for language ${languages}`,
          });
        }
      }
      // save the problem to the database
      const newProblem = await db.problem.create({
        data: {
          title,
          description,
          difficulty,
          tags,
          examples,
          constraints,
          testcases,
          codeSnippets,
          referenceSolutions,
          userId: req.user.id,
        },
      });
      return res.status(201).json({
        success: true,
        message: "Problem created successfully",
        newProblem,
      });
    }
  } catch (error) {}

  // going to check the user role once again
  // loop through each reference solution for different languages
};

export const getAllProblem = async (req, res) => {};

export const getProblem = async (req, res) => {};

export const updateProblem = async (req, res) => {};

export const deleteProblem = async (req, res) => {};

export const getSolvedProblem = async (req, res) => {};
