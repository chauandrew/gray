// Shared by gray.js and popup.js. A rule is "host" (domain-level) or
// "host/path-prefix" (path-level).
function parseRule(rule) {
  const slash = rule.indexOf("/");
  return slash === -1
    ? { domain: rule, path: null }
    : { domain: rule.slice(0, slash), path: rule.slice(slash) };
}

// Subdomain-inclusive (example.com exempts www.example.com), mirroring how
// the service worker's initiatorDomains dynamic rule matches subdomains
// automatically.
function ruleMatches(host, pathname, rule) {
  const { domain, path } = parseRule(rule);
  const domainMatch = host === domain || host.endsWith("." + domain);
  if (!domainMatch) return false;
  return path === null || pathname.startsWith(path);
}
