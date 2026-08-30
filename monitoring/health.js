/**
 * Health check controller for CHECK-PLAN-GENERATOR-AGENTS
 */
function getHealthStatus() {
  return {
    service: 'CHECK-PLAN-GENERATOR-AGENTS',
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}

module.exports = { getHealthStatus };
