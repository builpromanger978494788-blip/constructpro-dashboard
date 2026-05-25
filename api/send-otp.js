export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_3Xzouumx_2fcAzbn9E1dVFraWthKK5PdQ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BuildPro Security <onboarding@resend.dev>',
        to: 'builpromanger978494788@gmail.com',
        subject: `OTP Request for Staff: ${email}`,
        html: `<p>Staff member (<strong>${email}</strong>) is requesting to login.</p><p>Please provide them this OTP: <strong style="font-size:24px">${otp}</strong></p>`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
