'use client'

import Link from 'next/link';
import React from 'react';
const TermsAndConditions = () => {
  return (
    <div className="terms-container">
      <h1 className="title">Terms and Conditions</h1>
      <div className="content">
        <p>
          Welcome to our application. If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern our relationship with you in relation to this website.
        </p>
        <h2>1. Terms</h2>
        <p>
          By accessing the website, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.
        </p>
        <h2>2. Use License</h2>
        <p>
          Permission is granted to temporarily download one copy of the materials (information or software) on this website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <ul>
          <li>Modify or copy the materials;</li>
          <li>Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
          <li>Attempt to decompile or reverse engineer any software contained on this website;</li>
          <li>Remove any copyright or other proprietary notations from the materials; or</li>
          <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
        </ul>
        <p>
          This license shall automatically terminate if you violate any of these restrictions and may be terminated at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.
        </p>
        <h2>3. Disclaimer</h2>
        <p>
          The materials on this website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>
        <p>
          Further, we do not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on this website or otherwise relating to such materials or on any sites linked to this site.
        </p>
        <h2>4. Limitations</h2>
        <p>
          In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website, even if we or an authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.
        </p>
        <h2>5. Accuracy of materials</h2>
        <p>
          The materials appearing on this website could include technical, typographical, or photographic errors. We do not warrant that any of the materials on this website are accurate, complete or current. We may make changes to the materials contained on this website at any time without notice. However, we do not make any commitment to update the materials.
        </p>
        <h2>6. Links</h2>
        <p>
          We have not reviewed all of the sites linked to this website and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.
        </p>
        <h2>7. Modifications</h2>
        <p>
          We may revise these terms of service for this website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
        </p>
        <h2>8. Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which our company is based and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
        </p>
        <p>
          If you have any questions about these Terms, please contact us at the provided contact information.
        </p>
        <Link href="/">Back to Home</Link>
      </div>
      <style jsx>{`
        .terms-container {
          max-width: 800px;
          margin: 0 auto;
          padding-top: 80px;
          font-family: Arial, sans-serif;
          color: #fff;
        }
        .title {
          text-align: center;
          margin-bottom: 20px;
          font-size: 32px;
          font-weight: bold;
        }
        .content {
          line-height: 1.6;
        }
        h2 {
          margin-top: 20px;
          font-size: 24px;
          font-weight: bold;
        }
        ul {
          list-style-type: disc;
          padding-left: 20px;
        }
        ul li {
          margin-bottom: 10px;
        }
        a {
          color: #007bff;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default TermsAndConditions;
