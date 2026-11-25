class PromptRefinery < Formula
  desc "Model-agnostic prompt compiler for desktop AI agents"
  homepage "https://github.com/znnw4m6k7k-dotcom/Prompt-optimization"
  url "https://registry.npmjs.org/prompt-refinery/-/prompt-refinery-0.1.0.tgz"
  sha256 "REPLACE_WITH_NPM_TARBALL_SHA256"
  license "Apache-2.0"

  depends_on "node"

  def install
    libexec.install Dir["*"]
    chmod 0755, libexec/"bin/prompt-refinery.js"
    bin.install_symlink libexec/"bin/prompt-refinery.js" => "prompt-refinery"
    bin.install_symlink libexec/"bin/prompt-refinery.js" => "prfy"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/prompt-refinery --version")
    assert_match "## 任务目标", pipe_output("#{bin}/prfy enhance --provider heuristic", "分析这个表")
  end
end
