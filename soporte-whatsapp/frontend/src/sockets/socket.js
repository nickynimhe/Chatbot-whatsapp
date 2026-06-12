import { io } from 'socket.io-client'
import { API_BASE, getToken } from '../api'

const socket = io(API_BASE, { autoConnect: false })

export function connectSocket() {
    socket.auth = { token: getToken() }
    if (!socket.connected) socket.connect()
}

export default socket
