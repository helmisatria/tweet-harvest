import * as fs from "fs";
import * as Papa from "papaparse";
import { program } from "commander";

interface TweetData {
  username: string;
  tweet_url: string;
  in_reply_to_screen_name: string;
}

interface ProcessedData {
  source: string;
  target: string;
}

const readCSV = (filePath: string): Promise<TweetData[]> => {
  return new Promise((resolve, reject) => {
    const file = fs.createReadStream(filePath);
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        return resolve(results.data as TweetData[]);
      },
      error: (error) => reject(error),
    });
  });
};

const processTweetData = (data: TweetData[]): ProcessedData[] => {
  return data.map((row) => {
    const source = row.tweet_url.startsWith("https") ? row.username : row.tweet_url;
    const target = row.in_reply_to_screen_name;
    return { source, target };
  });
};

const writeCSV = (data: ProcessedData[], outputFilePath: string) => {
  const csvData = Papa.unparse(data, {
    columns: ["source", "target"],
  });

  fs.writeFile(outputFilePath, csvData, (err) => {
    if (err) {
      console.error("Error writing CSV file", err);
    } else {
      console.log("CSV file was written successfully");
    }
  });
};

program
  .version("1.0.0")
  .description("CSV Processing Script")
  .requiredOption("-i, --input <type>", "Input CSV file path")
  .requiredOption("-o, --output <type>", "Output CSV file path")
  .parse(process.argv);

const options = program.opts();

readCSV(options.input)
  .then(processTweetData)
  .then((processedData) => writeCSV(processedData, options.output))
  .catch((error) => console.error(error));
