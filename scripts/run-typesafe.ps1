param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Command)
$ErrorActionPreference = 'Stop'
if (-not $Command -or $Command.Count -eq 0) { $Command = @('node', 'scripts/typesafe-canary.mjs') }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GitTeachWinCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags; public UInt32 Type; public IntPtr TargetName; public IntPtr Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize; public IntPtr CredentialBlob; public UInt32 Persist;
    public UInt32 AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
  [DllImport("Advapi32.dll", SetLastError=true)] public static extern void CredFree(IntPtr cred);
}
'@
$ptr=[IntPtr]::Zero
if(-not [GitTeachWinCred]::CredRead('TypeSafe:MSSR:JevLab',1,0,[ref]$ptr)){throw 'TypeSafe:MSSR:JevLab was not found in Windows Credential Manager.'}
try {
 $c=[Runtime.InteropServices.Marshal]::PtrToStructure($ptr,[type][GitTeachWinCred+CREDENTIAL])
 $bytes=New-Object byte[] $c.CredentialBlobSize
 [Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob,$bytes,0,$bytes.Length)
 $secret=[Text.Encoding]::Unicode.GetString($bytes).Trim([char]0)
 if([string]::IsNullOrWhiteSpace($secret)){$secret=[Text.Encoding]::UTF8.GetString($bytes).Trim([char]0)}
 if([string]::IsNullOrWhiteSpace($secret)){throw 'TypeSafe credential is empty or unreadable.'}
 $env:TYPESAFE_API_KEY=$secret
 if($Command.Count -eq 1){ & $Command[0] } else { & $Command[0] $Command[1..($Command.Count-1)] }
 exit $LASTEXITCODE
} finally {
 Remove-Item Env:TYPESAFE_API_KEY -ErrorAction SilentlyContinue
 if($bytes){[Array]::Clear($bytes,0,$bytes.Length)}
 $secret=$null
 [GitTeachWinCred]::CredFree($ptr)
}
