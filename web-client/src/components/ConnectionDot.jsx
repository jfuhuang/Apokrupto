export default function ConnectionDot({ isConnected }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 9999,
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: isConnected ? '#00FF9F' : '#6C757D',
        boxShadow: isConnected ? '0 0 6px #00FF9F' : 'none',
        transition: 'background-color 0.3s, box-shadow 0.3s',
      }}
    />
  )
}
