import { all } from "axios";
import {
  getLanguageName,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";
import { db } from "../libs/db.js";

export const executeCode = async (req, res) => {
  try {
    const { source_code, language_id, stdin, expected_output, problem_id } =
      req.body;
    const userId = req.user.id;

    // Validate input
    console.log("Executing code done", )
    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_output) ||
      expected_output.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid input format" });
    }

    // 2. Prepare the test cases for the Judge0 API
    const submissions = stdin.map((input, output) => {
      return {
        source_code,
        language_id,
        stdin: input,
      };
    });

    // 3. Send the submissions to the Judge0 API

    const submittedSubmissions = await submitBatch(submissions);

    if (!submittedSubmissions || submittedSubmissions.length === 0) {
      return res
        .status(500)
        .json({ error: "Failed to submit code for execution" });
    }

    // 4. Extract the tokens from the submitted submissions

    const tokens = submittedSubmissions.map((submission) => {
      return submission.token;
    });

    // 5. Poll for the results of the submissions
    const results = await pollBatchResults(tokens);
    if (!results || results.length === 0) {
      return res
        .status(500)
        .json({ error: "Failed to get results from Judge0" });
    }

    // console.log("Batch result after polling:", results);

    // 6. Check if the output matches the expected output
    let allPassed = true;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.stdout?.trim() !== expected_output[i]?.trim()) {
        console.log(
          `Output does not match expected output for input ${stdin[i]}`
        );
        allPassed = false;
        //  return{
        //   message: `Output does not match expected output for input ${stdin[i]}`,
        //   input: stdin[i],
        //   expected_output: expected_output[i],
        //   output: result.stdout || result.stderr,
        //   status: result.status.description,
        //   time: result.time,
        //   memory: result.memory,
        // };
      }
    }
    console.log(problem_id, "problem id");
    // 7. save the results to the database

    const submission = await db.submission.create({
      data: {
        problemId: problem_id,
        userId,
        sourceCode: source_code,
        language: getLanguageName(language_id),
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(results.map((result) => result.stdout || "")),
        stderr:
          results.some((result) => result.stderr) ||
          JSON.stringify(results.map((result) => result.stderr)) ||
          null,
        compileOutput:
          results.some((result) => result.compile_output) ||
          JSON.stringify(results.map((result) => result.compile_output)) ||
          null,
        status: allPassed ? "Accepted" : "Wrong Answer",
        time: JSON.stringify(
          results.reduce((acc, result) => acc + result.time, 0)
        ),
        memory: JSON.stringify(
          results.reduce((acc, result) => acc + result.memory, 0)
        ),
      },
    });
    console.log("ami achi...");

    // 8. if all done then mark for the current user

    if (allPassed) {
      await db.problemSolved.upsert({
        where: { userId_problemId: { userId, problemId: problem_id } },
        update: {
          userId,
          problemId: problem_id
          // submissionId: submission.id,
        },
        create: {
          userId,
          problemId: problem_id
          // submissionId: submission.id,
        },
      });
    }

    // 9. individual result for each test case
    console.log("results:", results);
    const testCaseResults = results.map((result, index) => ({
      submissionId: submission.id,
      testCaseId: allPassed ? 3 : 2,
      passed: allPassed,
      stdout: result.stdout,
      expectedOutput: expected_output[index],
      stderr: result.stderr,
      compileOutput: result.compile_output,
      status: allPassed ? "Accepted" : "Wrong Answer",
      time: result.time,
      memory: String(result.memory) || null,
    }));

    await db.testCaseResult.createMany({
      data: testCaseResults,
      skipDuplicates: true, // Skip duplicates if any
    });

    // 10. get all test case results
    const submissionWithTestCases = await db.submission.findUnique({
      where: { id: submission.id },
      include: {
        testCases: true, // Include the test case results
      },
    });

    return res.status(200).json({
      message: "Code executed successfully",
      // results: results.map((result, index) => ({
      //   input: stdin[index],
      //   expected_output: expected_output[index],
      //   output: result.stdout || result.stderr,
      //   status: result.status.description,
      //   time: result.time,
      //   memory: result.memory,
      // })),
      submission: submissionWithTestCases,
    });
  } catch (error) {
    console.error("Error executing code:", error);
    res.status(500).json({
      error: "An error occurred while executing the code",
      details: error.message,
    });
  }
};
