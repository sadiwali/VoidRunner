using UnityEngine;
using System.Collections;
using UnityEngine.UI;
using UnityEngine.EventSystems;

public class SetInputFieldTexture : UIBehaviour
{

    public InputField inputField = null;

    IEnumerator Start()
    {
        // wait a frame such that the caret GO gets created.

        yield return null;
        if (inputField == null)
            inputField = GetComponent<InputField>();

        if (inputField != null)
        {
            // Find the child by name. This usually isnt good but is the easiest way for the time being.
            Transform caretGO = inputField.transform.FindChild(inputField.transform.name + " Input Caret");
            caretGO.GetComponent<CanvasRenderer>().SetMaterial(Graphic.defaultGraphicMaterial, Texture2D.whiteTexture);
        }
    }
}