import express from "express"
import crypto from "crypto"

const app = express();
app.use(express.json());

app.post("/verify", (req, res) => {
    const {proofRef} = req.body;

    if(!proofRef || proofRef.length < 10) {
        return res.json({
            valid: false,
            score: 0.1,
            reason: "Invalid proof format"
        });
    }

      if (proofRef.includes("fraud")) {
    return res.json({
      valid: false,
      score: 0.05,
      reason: "Fraud keyword detected",
    });
  }

  if (proofRef.includes("valid")) {
    return res.json({
      valid: true,
      score: 0.95,
      reason: "Valid proof pattern detected",
    });
  }

  // Deterministic hash-based fallback
  const hash = crypto.createHash("sha256").update(proofRef).digest("hex");
   const numeric = parseInt(hash.slice(0, 8), 16);

   const isValid = numeric % 2 === 0;

   res.json({
    valid: isValid,
    score: isValid ? 0.8 : 0.3,
    reason: isValid ? "Hash rule passed" : "Hash rule failed",
   })
})

app.listen(3001, () => {
    console.log("Verification API running on http://localhost:3001");
})