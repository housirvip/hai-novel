import pc from "picocolors";

function printLine(prefix: string, message: string): void {
  console.log(`${prefix} ${message}`);
}

export const logger = {
  start(message: string): void {
    printLine(pc.cyan("[start]"), message);
  },
  progress(message: string): void {
    printLine(pc.blue("[progress]"), message);
  },
  success(message: string): void {
    printLine(pc.green("[success]"), message);
  },
  error(message: string): void {
    printLine(pc.red("[error]"), message);
  },
  info(message: string): void {
    printLine(pc.gray("[info]"), message);
  }
};
