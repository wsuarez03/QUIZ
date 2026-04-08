import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { isConfigured, adminDbInstance } from '@/lib/firebaseAdmin';

let preferAdminForDelete = Boolean(isConfigured && adminDbInstance);

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return Response.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const sessionUserId = String(session.user.id || '');
    const sessionUserEmail = String(session.user.email || '').toLowerCase();
    // Obtener el ID del resultado desde el query string
    const url = new URL(request.url);
    const resultId = url.searchParams.get('id');

    if (!resultId) {
      return Response.json({ error: 'ID de resultado no proporcionado' }, { status: 400 });
    }

    let canUseAdmin = Boolean(preferAdminForDelete && adminDbInstance);
    let resultData: any = null;

    // Intentar Admin SDK primero
    if (canUseAdmin) {
      try {
        const resultRef = adminDbInstance!.collection('saved_results').doc(resultId);
        const resultSnap = await resultRef.get();

        if (!resultSnap.exists) {
          return Response.json({ error: 'Resultado no encontrado' }, { status: 404 });
        }

        resultData = resultSnap.data();

        // Verificar que el usuario sea propietario
        const ownerId = String(resultData?.ownerId || '');
        const ownerEmail = String(resultData?.ownerEmail || '').toLowerCase();
        const isOwner =
          (sessionUserId && ownerId === sessionUserId) ||
          (sessionUserEmail && ownerEmail === sessionUserEmail);

        if (!isOwner) {
          console.warn(`[DELETE] Permission denied for user ${sessionUserId || sessionUserEmail}`);
          return Response.json({ error: 'No tienes permiso para eliminar este resultado' }, { status: 403 });
        }

        // Eliminar con Admin SDK
        await resultRef.delete();
        return Response.json({ success: true, message: 'Resultado eliminado correctamente' });
      } catch (adminError: any) {
        canUseAdmin = false;
        preferAdminForDelete = false;
        console.warn('[DELETE] Admin SDK failed, using Client SDK fallback:', adminError?.message || adminError);
      }
    }

    // Fallback a Client SDK
    if (!canUseAdmin) {
      const resultRef = doc(db, 'saved_results', resultId);
      const resultSnap = await getDoc(resultRef);

      if (!resultSnap.exists()) {
        return Response.json({ error: 'Resultado no encontrado' }, { status: 404 });
      }

      resultData = resultSnap.data();

      // Verificar que el usuario sea propietario
      const ownerId = String(resultData?.ownerId || '');
      const ownerEmail = String(resultData?.ownerEmail || '').toLowerCase();
      const isOwner =
        (sessionUserId && ownerId === sessionUserId) ||
        (sessionUserEmail && ownerEmail === sessionUserEmail);

      if (!isOwner) {
        console.warn(`[DELETE] Permission denied for user ${sessionUserId || sessionUserEmail}`);
        return Response.json({ error: 'No tienes permiso para eliminar este resultado' }, { status: 403 });
      }

      // Eliminar con Client SDK
      await deleteDoc(resultRef);
      return Response.json({ success: true, message: 'Resultado eliminado correctamente' });
    }

  } catch (error: any) {
    console.error('[DELETE] Error eliminando resultado:', error);
    return Response.json(
      { error: error?.message || 'Error al eliminar el resultado' },
      { status: 500 }
    );
  }
}
