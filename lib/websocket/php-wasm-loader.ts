// lib/websocket/php-wasm-loader.ts

export class PhpWasmLoader {
  private phpBinary: string

  constructor(phpBinary: string) {
    this.phpBinary = phpBinary
  }

  async run(code: string): Promise<string> {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const input = encoder.encode(code)

    const process = Deno.run({
      cmd: [this.phpBinary, "-r", code],
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    })

    await process.stdin.write(input)
    process.stdin.close()

    const [status, stdout, stderr] = await Promise.all([process.status(), process.output(), process.stderrOutput()])

    process.close()

    if (!status.success) {
      const errorText = decoder.decode(stderr)
      throw new Error(`PHP process failed: ${errorText}`)
    }

    return decoder.decode(stdout)
  }

  async getFileContents(path: string): Promise<string | null> {
    // Create a PHP script to read the file
    const escapedPath = path.replace(/'/g, "\\'")

    const code = `<?php
    $path = '${escapedPath}';
    $content = getFileContents($path);
    if ($content !== null) {
      echo json_encode(['content' => $content, 'type' => getFileType($path)]);
    } else {
      echo json_encode(null);
    }
  ?>`

    const output = await this.run(code)
    try {
      const result = JSON.parse(output)
      return result ? result : null
    } catch (e) {
      return null
    }
  }
}
