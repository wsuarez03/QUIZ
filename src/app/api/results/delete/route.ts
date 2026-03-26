import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { isConfigured, adminDbInstance } from '@/lib/firebaseAdmin';

let preferAdminForDelete = true;

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Obtener el ID del resultado desde el query string
    const url = new URL(request.url);
    const resultId = url.searchParams.get('id');

    if (!resultId) {
      return Response.json({ error: 'ID de resultado no proporcionado' }, { status: 400 });
    }

    let resultData: any = null;
    let deleted = false;

    // Intentar usar Admin SDK si está configurado y preferido
    if (isConfigured && adminDbInstance && preferAdminForDelete) {
      try {
        const resultRef = adminDbInstance.collection('saved_results').doc(resultId);
        const resultSnap = await resultRef.get();

        if (!resultSnap.exists) {
          return Response.json({ error: 'Resultado no encontrado' }, { status: 404 });
        }

        resultData = resultSnap.data();

        // Verificar que el usuario sea propietario
        if (resultData.ownerId !== session.user.id) {
          console.warn(`[DELETE] Permission denied: ${resultData.ownerId} !== ${session.user.id}`);
          return Response.json({ error: 'No tienes permiso para eliminar este resultado' }, { status: 403 });
        }

        // Eliminar
        await resultRef.delete();
        deleted = true;
      } catch (adminError: any) {
        console.warn('[DELETE] Admin SDK failed, fallback to Client SDK:', adminError?.message || adminError);
        preferAdminForDelete = false;
      }
    }

    // Fallback a Client SDK si Admin no se usó o falló
    if (!deleted) {
      const resultRef = doc(db, 'saved_results', resultId);
      const resultSnap = await getDoc(resultRef);

      if (!resultSnap.exists()) {
        return Response.json({ error: 'Resultado no encontrado' }, { status: 404 });
      }

      resultData = resultSnap.data();

      // Verificar que el usuario sea propietario
      if (resultData.ownerId !== session.user.id) {
        console.warn(`[DELETE] Permission denied: ${resultData.ownerId} !== ${session.user.id}`);
        return Response.json({ error: 'No tienes permiso para eliminar este resultado' }, { status: 403 });
      }

      // Eliminar
      await deleteDoc(resultRef);
    }

    return Response.json({ success: true, message: 'Resultado eliminado correctamente' });
  } catch (error: any) {
    console.error('[DELETE] Error eliminando resultado:', error);
    return Response.json(
      { error: error?.message || 'Error al eliminar el resultado' },
      { status: 500 }
    );
  }
}
