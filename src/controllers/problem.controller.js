import e from "express";
import { db } from "../libs/db.js";
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";

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

      console.log("Submissions:========", submissions);

      const submissionResults = await submitBatch(submissions);

      const tokens = submissionResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);

      console.log("Batch results:", results);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        console.log("Result -----", result);
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
  } catch (error) {
    console.error("Error creating problem:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getAllProblem = async (req, res) => {
  try {
    const problems = await db.problem.findMany({});

    if (!problems) {
      return res.status(404).json({
        success: false,
        error: "No problems found",
      });
    }

    res.status(200).json({
      success: true,
      message: "All problems fetched successfully",
      problems,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error fetching All problems",
      details: error.message,
    });
  }
};

export const getProblemById = async (req, res) => {
  const { id } = req.params;

  try {
    const problem = await db.problem.findUnique({
      where: {
        id,
      },
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Problem fetched successfully",
      problem,
    });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return res.status(500).json({
      success: false,
      error: "while fetching problem by id",
      details: error.message,
    });
  }
};

export const updateProblem = async (req, res) => {
  const { id } = req.params;
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
      error: "You are not authorized to update a problem",
    });
  }
  const existProblem = await db.problem.findUnique({
    where: {
      id,
    },
  });
console.log(existProblem, "Exist Problem");

  if (!existProblem) {
    return res.status(404).json({
      success: false,
      error: "Problem not found",
    });
  }

  try {
    // Validate the reference solutions and test cases by submitting them to Judge0====================================
    
    
    for(const [languages, solutionCode] of Object.entries(referenceSolutions)) {
      const languageId = getJudge0LanguageId(languages);
      if (languageId === null) {
        return res.status(400).json({
          success: false,
          error: `Unsupported language: ${languages}`,
        });
      }

      console.log(languageId, "Language ID for the solution code");
      
      const submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));

      const batchResults = await submitBatch(submissions); // send the batch of submissions to Judge0 token for each submission

      const tokens = batchResults.map((result) => result.token);

      const results = await pollBatchResults(tokens); // Poll the results until all submissions are done
      console.log("Batch results:", results);

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

      const updatedProblem = await db.problem.update({
        where: {
          id,
        },
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
        },

      });

      return res.status(200).json({
        success: true,
        message: "Problem updated successfully",
        updatedProblem,
      });
    }
  } catch (error) {
    // console.log("Error updating problem:", error);
    return res.status(500).json({
      success: false,
      error: "Updating problem failed",
      details: error.message,
    });
  }
};

export const deleteProblem = async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: "You are not authorized to delete a problem",
    });
  }

  try {
    
    const problem = await db.problem.findUnique({
      where:{
        id
      }
    })

    if(!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    await db.problem.delete({
      where:{
        id
      }
    })
    return res.status(200).json({
      success: true,
      message: "Problem deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting problem:", error);
    return res.status(500).json({
      success: false,
      error: "Error deleting problem",
      details: error.message,
    });
  }
};

export const getSolvedProblem = async (req, res) => {
  try {
    const userId = req.user.id;
    const problems = await db.problem.findMany({
      where:{
        solvedBy:{
          some:{
            userId: userId
          }
        }
      },
      include: {
        solvedBy: {
          where: {
            userId: userId
          }
        }
      }
    })
    console.log(problems, "Solved Problems");

    if (!problems || problems.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No solved problems found for this user",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Solved problems fetched successfully",
      problems,
    });
  } catch (error) {
    console.error("Error fetching solved problems:", error);
    return res.status(500).json({
      success: false,
      error: "Error fetching solved problems",
      details: error.message,
    });
  }
};
