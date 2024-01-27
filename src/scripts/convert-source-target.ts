#!/usr/bin/env node

import * as fs from "fs";
import * as Papa from "papaparse";
import { program } from "commander";
import { pick } from "lodash";

interface InputRow {
  username: string;
  in_reply_to_screen_name: string;
}

interface OutputRow {
  source: string;
  target: string;
}

function readCSV(filePath: string): Promise<InputRow[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    Papa.parse(fileContent, {
      header: true,
      complete: (result) => {
        const data = (result.data.map((d) => pick(d, ["username", "in_reply_to_screen_name"])) as InputRow[]).filter(
          (d) => d.username || d.in_reply_to_screen_name
        );
        resolve(data);
      },
      error: (error) => reject(error),
    });
  });
}

function writeCSV(filePath: string, data: OutputRow[]): void {
  const csv = Papa.unparse(data, {
    columns: ["source", "target"],
    delimiter: ",",
    header: true,
    quotes: true,
  });
  fs.writeFileSync(filePath, csv, "utf8");
  console.log(`CSV file was written successfully to ${filePath}`);
}

async function transformCSV(inputFilePath: string, outputFilePath: string) {
  try {
    const inputData = await readCSV(inputFilePath);
    const outputData: OutputRow[] = inputData.map((row) => ({
      source: row.username,
      target: row.in_reply_to_screen_name || "",
    }));

    writeCSV(outputFilePath, outputData);
  } catch (error) {
    console.error("Error processing CSV file:", error);
  }
}

program
  .requiredOption("-i, --input <path>", "Input CSV file path")
  .requiredOption("-o, --output <path>", "Output CSV file path");

program.parse(process.argv);

const options = program.opts();
transformCSV(options.input, options.output);
