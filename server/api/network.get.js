import { networkInterfaces } from 'node:os'

/**
 * GET /api/network — LAN IPv4-adressen van deze machine.
 * Wordt gebruikt om een QR-code te maken die telefoons op hetzelfde netwerk kunnen openen,
 * ook als de game master zelf via http://localhost kijkt.
 */
export default defineEventHandler(() => {
  const addresses = []
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    // Virtuele adapters (WSL, Hyper-V, VirtualBox, VPN) overslaan
    if (/vethernet|wsl|virtualbox|vmware|hyper-v|loopback|docker|tailscale|zerotier/i.test(name)) continue
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal && !info.address.startsWith('169.254.')) {
        addresses.push(info.address)
      }
    }
  }
  // Voorkeur voor typische thuis-/kantoornetwerken
  addresses.sort((a, b) => score(b) - score(a))
  return { addresses }
})

function score(ip) {
  if (ip.startsWith('192.168.')) return 3
  if (ip.startsWith('10.')) return 2
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 1
  return 0
}
