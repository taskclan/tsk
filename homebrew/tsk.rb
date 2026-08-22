# Formula for the Taskclan Cloud CLI.
#
# Lives in taskclan/homebrew-tap, which is what makes the install line
# `brew install taskclan/tap/tsk`.
#
# The CLI has no npm dependencies at all, so this copies the tree into libexec
# and symlinks the entrypoint — there is no `npm install` step to fail offline,
# in a sandbox, or when the registry is having a day. The shebang is
# `/usr/bin/env node`, and `depends_on "node"` is what puts a suitable one on
# PATH.
class Tsk < Formula
  desc "Deploy, scale, tail logs and roll back on Taskclan Cloud"
  homepage "https://cloud.taskclan.com"
  url "https://github.com/taskclan/tsk/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_SHA256"
  license "MIT"

  depends_on "node"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/tsk.js" => "tsk"
  end

  test do
    # The two commands that must work with no network and no account.
    assert_match version.to_s, shell_output("#{bin}/tsk version")
    assert_match "Taskclan Cloud", shell_output("#{bin}/tsk help")
  end
end
