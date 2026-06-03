$authFile = "src\lib\auth.ts"
$content = Get-Content $authFile -Raw

$managementLoginFunc = @"

export const managementLogin = async (phone: string): Promise<Management | null> => {
  try {
    const management = await db.findOne<Management>('management', { phone });
    if (!management) {
      return null;
    }
    if (management.status !== 'active') {
      return null;
    }
    localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(management));
    updateLastActivity();
    return management;
  } catch (error) {
    console.error('Management login error:', error);
    return null;
  }
};

export const getCurrentManagement = (): Management | null => {
  const stored = localStorage.getItem(MANAGEMENT_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};
"@

# Find the position after getCurrentMentor function
$pattern = "export const getCurrentMentor = \(\): Mentor \| null => \{[^}]+\};"
if ($content -match $pattern) {
    $match = $Matches[0]
    $content = $content.Replace($match, $match + $managementLoginFunc)
}

# Update logout function to also remove MANAGEMENT_STORAGE_KEY
$content = $content -replace "localStorage\.removeItem\(MENTOR_STORAGE_KEY\);", "localStorage.removeItem(MENTOR_STORAGE_KEY);`r`n  localStorage.removeItem(MANAGEMENT_STORAGE_KEY);"

$content | Set-Content $authFile -NoNewline
Write-Host "Done"
