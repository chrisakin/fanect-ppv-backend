##  Verification Email
      You are receiving this because you (or someone else) have requested to verify their email.

      Use the code below to complete the process:

      <div class="code-box">{{code}}

      If you did not request this, you can safely ignore this email.


## Event Live Stream Begins Email
      <p>Hi {{userName}},</p>

      <p>The live stream for your event has just started! Here are your event details:</p>

         Event:
          {{eventName}}
    
         Event Date:
          {{eventDate}}
    
         Event Time:
          {{eventTime}}
    
    

      <div class="cta-container">
        <a href="{{eventLink}}" class="cta-button" target="_blank" rel="noopener">
          Join Event
        </a>
    

      <p>If you need any assistance, please contact <a href="mailto:support@fanect.com">support@fanect.com</a>.</p>

      <p>Enjoy the event!<br/>— The FaNect Team</p>


## Event Live Stream Ends
<div class="title">🎬 Event Stream Ended</div>

    <div class="content">
      <p>Hi {{userName}},</p>

      <p>The live stream for your event has ended. Here are your event details:</p>

      <div class="receipt-box">
        <div class="receipt-item">
          <strong>Event:</strong>
          <span>{{eventName}}</span>
        </div>
         <div class="receipt-item">
          <strong>Event Date:</strong>
          <span>{{eventDate}}</span>
        </div>
         <div class="receipt-item">
          <strong>Event Time:</strong>
          <span>{{eventTime}}</span>
        </div>
      </div>

## Event Created Status Email

    <div class="title">📋 Event Review Update</div>

      <p>Hi {{userName}},</p>

      <p>Your event submission has been reviewed. Here are the results:</p>

      <div class="receipt-box">
        <div class="receipt-item">
          <strong>Event:</strong>
          <span>{{eventName}}</span>
        </div>
        <div class="receipt-item">
          <strong>Status:</strong>
          <span class="{{statusClass}}">
            {{status}} <!-- Approved or Rejected -->
          </span>
        </div>
        {{#if rejectedReason}}
        <div class="receipt-item" style="flex-direction: column; align-items: flex-start;">
          <strong>Rejection Reason:</strong>
          <span style="margin-top: 1px;">{{rejectedReason}}</span>
        </div>
        {{/if}}
      </div>

      {{#if isApproved}}
        <p>🎉 Congratulations! Your event has been approved and is now live on the platform. You can start promoting it to your audience.</p>
      {{else}}
        <p>Unfortunately, your event could not be approved at this time. Please review the reason above and consider making the necessary changes before resubmitting.</p>
      {{/if}}

      <p>If you have any questions or need further help, feel free to reach out to us at <a href="mailto:support@fanect.com">support@fanect.com</a>.</p>

      <p>Best regards,<br/>— The FaNect Team</p>


## Streampass Email

    <div class="title">🎟️ Your Streampass Receipt</div>

    <div class="content">
      <p>Hi {{userName}},</p>

      <p>Thank you for your payment. Below are your event streampass details:</p>

      <div class="receipt-box">
        <div class="receipt-item">
          <strong>Event:</strong>
          <span>{{eventName}}</span>
        </div>
         <div class="receipt-item">
          <strong>Event Date:</strong>
          <span>{{eventDate}}</span>
        </div>
         <div class="receipt-item">
          <strong>Event Time:</strong>
          <span>{{eventTime}}</span>
        </div>
        <div class="receipt-item">
          <strong>Reference:</strong>
          <span>{{paymentReference}}</span>
        </div>
        <div class="receipt-item">
          <strong>Date:</strong>
          <span>{{paymentDate}}</span>
        </div>
        <div class="receipt-item">
          <strong>Amount:</strong>
          <span>{{amount}}</span>
        </div>
      </div>


## Email Sent to the Gift Sender
        <strong>Gifted To:</strong>
          {{#each friends}}
            <li style="margin-bottom: 6px;">
              {{firstName}} (<a href="mailto:{{email}}" style="color: #16a34a; text-decoration: none;">{{email}}</a>)
            </li>
          {{/each}}

      <p>The Streampass has been sent and {{receiverName}} has been notified.</p>

      <p>Thanks for sharing the experience!</p>

      <p>— The FaNect Team</p>
    </div>


## Email Sent to the Gift Receiver
    <div class="title">🎁 You've Received a Gift Streampass!</div>

    <div class="content">
      <p>Hi {{receiverName}},</p>

      <p><span class="highlight">{{giverName}}</span> just gifted you a streampass for:</p>

      <div class="receipt-box">
        <div class="receipt-item">
          <strong>Event:</strong>
          <span>{{eventName}}</span>
        </div>
        <div class="receipt-item">
          <strong>Date:</strong>
          <span>{{eventDate}}</span>
        </div>
        <div class="receipt-item">
          <strong>Time:</strong>
          <span>{{eventTime}}</span>
        </div>
      </div>

      <p>Click the button below to access your stream:</p>

      <a href="{{accessUrl}}" class="cta-button">Join Event</a>


## Password Reset
      <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>

      <p>Please click the button below to complete the process:</p>

      <p style="text-align: center;">
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </p>

      <p>Or paste this link into your browser:</p>
      <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>

      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    </div>

## Password Reset For Mobile
      <p>You are receiving this because you (or someone else) have requested a password reset for your account.</p>

      <p>Use the code below to complete the process:</p>

      <div class="code-box">{{code}}</div>

      <p>If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
